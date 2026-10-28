class PagesController < ApplicationController
  include FeatureGated
  include AttachmentJson

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:pages) }
  before_action :set_page, only: [ :show, :update, :destroy ]

  def index
    pages = project_filtered(@team.pages.without_content.includes(creator: User::AVATAR_PRELOAD))
    return if pages.nil?

    pages = in_listed_folder(pages)
    return if pages.nil?

    pages, has_more = paginate(pages.search_title(params[:search]).order(Arel.sql("LOWER(title)"), :id))
    render json: { pages: pages.map { |page| page_summary_json(page) }, has_more: has_more }
  end

  def create
    @page = @team.pages.new(created_by_user_id: current_user.id)
    @page.title = title_or_default(create_page_params[:title])
    @page.content = PageContent.sanitize(create_page_params[:content])
    return unless place_in_folder(@page, create_page_params, :folder_id)

    case save_page(PageAttachments.new(@page, current_user, project_access, pending_file_ids: create_page_params[:attachment_ids]))
    when :saved then render json: { page: page_json(@page) }, status: :created
    when :quota_exceeded then render_error(ErrorCodes::Attachments::STORAGE_QUOTA_EXCEEDED, :unprocessable_entity)
    else render_error(limit_error_code(@page) || ErrorCodes::Pages::PAGE_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { page: page_json(@page) }
  end

  def update
    return unless assign_lock_version(@page, update_page_params, :title, :content)

    @page.title = update_page_params[:title] if update_page_params[:title].present?
    @page.content = PageContent.sanitize(update_page_params[:content]) if update_page_params.key?(:content)
    return unless place_in_folder(@page, update_page_params, :folder_id)

    case save_page(update_page_params.key?(:content) ? PageAttachments.new(@page, current_user, project_access) : nil)
    when :saved
      @page.page_contributors.find_or_create_by!(user: current_user)
      PageEditingStatus.stop(@page.id, current_user)
      render json: { page: page_json(find_page(@page.id)) }
    when :quota_exceeded
      render_error(ErrorCodes::Attachments::STORAGE_QUOTA_EXCEEDED, :unprocessable_entity)
    else
      render_error(limit_error_code(@page) || ErrorCodes::Pages::PAGE_UPDATE_FAILED, :unprocessable_entity)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { page: page_json(find_page(@page.id)) })
  end

  def destroy
    entry = Trash.move(@page, current_user)
    render json: { trash_entry_ids: [ entry.id ] }
  end

  private

  def save_page(attachments)
    result = nil
    Page.transaction do
      result = if attachments && !attachments.prepare
        :quota_exceeded
      elsif @page.save
        attachments&.finish
        :saved
      else
        :invalid
      end
      raise ActiveRecord::Rollback unless result == :saved
    end
    result
  end

  def find_page(id)
    project_access.scope(@team.pages).includes(creator: User::AVATAR_PRELOAD, contributors: User::AVATAR_PRELOAD).find_by(id: id)
  end

  def set_page
    @page = find_page(params[:id])

    render_error(ErrorCodes::Pages::PAGE_NOT_FOUND, :not_found) if @page.nil?
  end

  def page_summary_json(page)
    {
      id: page.id,
      title: page.title,
      folder_id: page.folder_id,
      project_id: page.project_id,
      lock_version: page.lock_version,
      creator: member_json(page.creator),
      created_at: page.created_at,
      updated_at: page.updated_at
    }
  end

  def page_json(page)
    editing = PageEditingStatus.read(page.id)

    {
      id: page.id,
      title: page.title,
      content: page.content,
      folder_id: page.folder_id,
      project_id: page.project_id,
      lock_version: page.lock_version,
      creator: member_json(page.creator),
      contributors: page.contributors.map { |user| member_json(user) },
      attachments: attachments_json(page),
      created_at: page.created_at,
      updated_at: page.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end
end
