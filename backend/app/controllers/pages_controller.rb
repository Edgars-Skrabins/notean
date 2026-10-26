class PagesController < ApplicationController
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:pages) }
  before_action :set_page, only: [ :show, :update, :destroy ]

  def index
    pages = project_filtered(@team.pages.includes(creator: User::AVATAR_PRELOAD).search_title(params[:search]))
    return if pages.nil?

    render json: { pages: pages.map { |page| page_summary_json(page) } }
  end

  def create
    @page = @team.pages.new(created_by_user_id: current_user.id)
    @page.title = title_or_default(create_page_params[:title])
    @page.content = Rails::Html::SafeListSanitizer.new.sanitize(create_page_params[:content].to_s)
    return unless place_in_folder(@page, create_page_params, :folder_id)

    if @page.save
      render json: { page: page_json(@page) }, status: :created
    else
      render_error(limit_error_code(@page) || ErrorCodes::Pages::PAGE_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { page: page_json(@page) }
  end

  def update
    return unless assign_lock_version(@page, update_page_params, :title, :content)

    @page.title = update_page_params[:title] if update_page_params[:title].present?
    @page.content = Rails::Html::SafeListSanitizer.new.sanitize(update_page_params[:content].to_s) if update_page_params.key?(:content)
    return unless place_in_folder(@page, update_page_params, :folder_id)

    if @page.save
      @page.page_contributors.find_or_create_by!(user: current_user)
      PageEditingStatus.stop(@page.id, current_user)
      render json: { page: page_json(find_page(@page.id)) }
    else
      render_error(limit_error_code(@page) || ErrorCodes::Pages::PAGE_UPDATE_FAILED, :unprocessable_entity)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { page: page_json(find_page(@page.id)) })
  end

  def destroy
    @page.destroy
    head :no_content
  end

  private

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
      created_at: page.created_at,
      updated_at: page.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end
end
