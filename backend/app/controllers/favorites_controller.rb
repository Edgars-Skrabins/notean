class FavoritesController < ApplicationController
  SURFACE_COLUMNS = { "home" => :home_position, "sidebar" => :sidebar_position }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_favorite, only: [ :update, :destroy ]

  def index
    favorites = user_favorites.includes(:favoritable).order(:home_position).to_a
    cards = favorites.map(&:favoritable).grep(Card)
    ActiveRecord::Associations::Preloader.new(records: cards, associations: { column: :board }).call

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

    requested_position = update_favorite_params[:position]

    siblings = user_favorites.where.not(id: @favorite.id).order(column).to_a
    insert_at = requested_position.nil? ? siblings.length : requested_position.to_i.clamp(0, siblings.length)
    siblings.insert(insert_at, @favorite)

    siblings.each_with_index do |favorite, index|
      favorite.update_column(column, index)
    end

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
    when "Card" then Card.where(team: @team).find_by(id: favoritable_id)
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

    if favorite.favoritable.is_a?(Card)
      board = favorite.favoritable.column.board
      json.merge!(board_id: board.id, board_title: board.title)
    end

    json
  end
end
