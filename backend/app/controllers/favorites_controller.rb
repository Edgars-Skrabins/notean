class FavoritesController < ApplicationController
  SURFACE_COLUMNS = { "home" => :home_position, "sidebar" => :sidebar_position }.freeze
  TYPE_FEATURES = { "Page" => :pages, "Diagram" => :diagrams, "Board" => :boards, "Ticket" => :boards }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_favorite, only: [ :update, :destroy ]

  def index
    project_id = params[:project_id]
    return render_error(ErrorCodes::Projects::PROJECT_NOT_FOUND, :not_found) if project_id.present? && !project_access.project_visible?(project_id)

    favorites = user_favorites.where(favoritable_type: enabled_favoritable_types).order(:home_position).to_a
    preload_favoritables(favorites)
    tickets = favorites.map(&:favoritable).grep(Ticket)
    ActiveRecord::Associations::Preloader.new(records: tickets, associations: :board).call
    favorites = favorites.select { |favorite| favorite.favoritable && project_access.in_selection?(favorite.favoritable, project_id) }

    render json: { favorites: favorites.map { |favorite| favorite_json(favorite) } }
  end

  def create
    favoritable_type = create_favorite_params[:favoritable_type]

    unless Favorite::FAVORITABLE_TYPES.include?(favoritable_type)
      render_error(ErrorCodes::Favorites::FAVORITE_TYPE_INVALID, :unprocessable_entity)
      return
    end

    favoritable = find_favoritable(favoritable_type, create_favorite_params[:favoritable_id])

    if favoritable.nil?
      render_error(ErrorCodes::Favorites::FAVORITE_ITEM_NOT_FOUND, :not_found)
      return
    end

    existing = user_favorites.find_by(favoritable: favoritable)

    if existing
      render json: { favorite: favorite_json(existing) }
      return
    end

    @favorite = user_favorites.new(
      favoritable: favoritable,
      home_position: (user_favorites.minimum(:home_position) || 1) - 1,
      sidebar_position: (user_favorites.minimum(:sidebar_position) || 1) - 1
    )

    if @favorite.save
      render json: { favorite: favorite_json(@favorite) }, status: :created
    else
      render_error(ErrorCodes::Favorites::FAVORITE_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def update
    column = SURFACE_COLUMNS[update_favorite_params[:surface]]

    if column.nil?
      render_error(ErrorCodes::Favorites::FAVORITE_SURFACE_INVALID, :unprocessable_entity)
      return
    end

    siblings = user_favorites.where.not(id: @favorite.id).order(column).to_a
    insert_at = insert_and_reindex(siblings, @favorite, update_favorite_params[:position], column)
    @favorite.update_column(column, insert_at)

    render json: { favorite: favorite_json(@favorite) }
  end

  def destroy
    @favorite.destroy
    head :no_content
  end

  private

  def set_favorite
    @favorite = user_favorites.find_by(id: params[:id])

    render_error(ErrorCodes::Favorites::FAVORITE_NOT_FOUND, :not_found) if @favorite.nil?
  end

  def user_favorites
    current_user.favorites.where(team: @team)
  end

  def preload_favoritables(favorites)
    favorites.group_by(&:favoritable_type).each do |type, group|
      klass = type.constantize
      scope = klass.without_content if klass.respond_to?(:without_content)
      ActiveRecord::Associations::Preloader.new(records: group, associations: :favoritable, scope: scope).call
    end
  end

  def enabled_favoritable_types
    TYPE_FEATURES.select { |_type, feature| @team.feature_enabled?(feature) }.keys
  end

  def find_favoritable(favoritable_type, favoritable_id)
    case favoritable_type
    when "Page" then project_access.scope(@team.pages).find_by(id: favoritable_id)
    when "Diagram" then project_access.scope(@team.diagrams).find_by(id: favoritable_id)
    when "Board" then project_access.scope(@team.boards).find_by(id: favoritable_id)
    when "Ticket" then Ticket.where(team: @team, board: project_access.scope(@team.boards)).find_by(id: favoritable_id)
    end
  end

  def favorite_json(favorite)
    json = {
      id: favorite.id,
      favoritable_type: favorite.favoritable_type,
      favoritable_id: favorite.favoritable_id,
      title: favorite.favoritable.title,
      project_id: ProjectAccess.project_id_of(favorite.favoritable),
      home_position: favorite.home_position,
      sidebar_position: favorite.sidebar_position
    }

    if favorite.favoritable.is_a?(Ticket)
      ticket = favorite.favoritable
      json.merge!(board_id: ticket.board_id, board_title: ticket.board.title, in_backlog: ticket.column_id.nil?)
    end

    json
  end
end
