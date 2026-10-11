class FavoritesController < ApplicationController
  SURFACE_COLUMNS = { "home" => :home_position, "sidebar" => :sidebar_position }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_favorite, only: [ :update, :destroy ]

  def index
    favorites = user_favorites.includes(:favoritable).order(:home_position).to_a
    tickets = favorites.map(&:favoritable).grep(Ticket)
    ActiveRecord::Associations::Preloader.new(records: tickets, associations: :board).call

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

  def find_favoritable(favoritable_type, favoritable_id)
    case favoritable_type
    when "Page" then @team.pages.find_by(id: favoritable_id)
    when "Diagram" then @team.diagrams.find_by(id: favoritable_id)
    when "Board" then @team.boards.find_by(id: favoritable_id)
    when "Ticket" then Ticket.where(team: @team).find_by(id: favoritable_id)
    end
  end

  def favorite_json(favorite)
    json = {
      id: favorite.id,
      favoritable_type: favorite.favoritable_type,
      favoritable_id: favorite.favoritable_id,
      title: favorite.favoritable.title,
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
