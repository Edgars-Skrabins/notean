class BoardsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_board, only: [:show, :update, :destroy]

  def index
    boards = @team.boards
    boards = boards.where('LOWER(title) LIKE ?', "%#{params[:search].downcase}%") if params[:search].present?

    render json: { boards: boards.map { |board| board_summary_json(board) }, statusMessage: 'Boards found' }
  end

  def create
    @board = @team.boards.new(created_by_user_id: current_user.id)
    @board.title = create_board_params[:title].presence || 'Untitled'

    if @board.save
      Board::DEFAULT_COLUMN_TITLES.each_with_index do |title, index|
        @board.columns.create!(title: title, position: index)
      end

      render json: { board: board_json(@board), statusMessage: 'Board created successfully' }, status: :created
    else
      render json: { statusMessage: 'Failed to create board' }, status: :unprocessable_entity
    end
  end

  def show
    render json: { board: board_json(@board), statusMessage: 'Board found' }
  end

  def update
    @board.title = update_board_params[:title] if update_board_params[:title].present?

    if @board.save
      render json: { board: board_json(@board), statusMessage: 'Board updated successfully' }
    else
      render json: { statusMessage: 'Failed to update board' }, status: :unprocessable_entity
    end
  end

  def destroy
    @board.destroy
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

  def set_board
    @board = @team.boards.find_by(id: params[:id])

    render json: { statusMessage: 'Board not found' }, status: :not_found if @board.nil?
  end

  def board_summary_json(board)
    {
      id: board.id,
      title: board.title,
      creator: user_json(board.creator),
      created_at: board.created_at,
      updated_at: board.updated_at
    }
  end

  def board_json(board)
    board_summary_json(board).merge(
      columns: board.columns.map { |column| column_json(column) }
    )
  end

  def column_json(column)
    {
      id: column.id,
      title: column.title,
      position: column.position,
      cards: column.cards.map { |card| card_summary_json(card) }
    }
  end

  def card_summary_json(card)
    {
      id: card.id,
      title: card.title,
      position: card.position
    }
  end

  def user_json(user)
    { id: user.id, nickname: team_nicknames[user.id] }
  end
end
