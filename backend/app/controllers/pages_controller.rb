class PagesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_page, only: [:show, :update, :destroy]

  def index
    pages = @team.pages
    pages = pages.where('LOWER(title) LIKE ?', "%#{params[:search].downcase}%") if params[:search].present?

    render json: { pages: pages.map { |page| page_summary_json(page) }, statusMessage: 'Pages found' }
  end

  def create
    @page = @team.pages.new(created_by_user_id: current_user.id, content: '')
    @page.title = create_page_params[:title].presence || 'Untitled'

    if @page.save
      render json: { page: page_json(@page), statusMessage: 'Page created successfully' }, status: :created
    else
      render json: { statusMessage: 'Failed to create page' }, status: :unprocessable_entity
    end
  end

  def show
    render json: { page: page_json(@page), statusMessage: 'Page found' }
  end

  def update
    @page.title = update_page_params[:title] if update_page_params[:title].present?
    @page.content = Rails::Html::SafeListSanitizer.new.sanitize(update_page_params[:content].to_s) if update_page_params.key?(:content)
    @page.folder_id = update_page_params[:folder_id] if update_page_params.key?(:folder_id)

    if @page.save
      @page.page_contributors.find_or_create_by!(user: current_user)
      PageEditingStatus.stop(@page.id, current_user)
      render json: { page: page_json(@page), statusMessage: 'Page updated successfully' }
    else
      render json: { statusMessage: 'Failed to update page' }, status: :unprocessable_entity
    end
  end

  def destroy
    @page.destroy
    head :no_content
  end

  private

  def set_team
    @team = Team.find_by(code: params[:team_code])

    render json: { statusMessage: 'Team not found' }, status: :not_found if @team.nil?
  end

  def authorize_team_member!
    render json: { statusMessage: 'Forbidden' }, status: :forbidden unless current_user.memberships.exists?(team: @team)
  end

  def set_page
    @page = @team.pages.find_by(id: params[:id])

    render json: { statusMessage: 'Page not found' }, status: :not_found if @page.nil?
  end

  def page_summary_json(page)
    {
      id: page.id,
      title: page.title,
      folder_id: page.folder_id,
      creator: user_json(page.creator),
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
      creator: user_json(page.creator),
      contributors: page.contributors.map { |user| user_json(user) },
      created_at: page.created_at,
      updated_at: page.updated_at,
      currently_editing: editing && { id: editing[:user_id], nickname: editing[:nickname] }
    }
  end

  def user_json(user)
    { id: user.id, nickname: team_nicknames[user.id], avatar: avatar_json(user) }
  end
end
