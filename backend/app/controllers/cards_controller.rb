class CardsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_board
  before_action :set_card, only: [ :show, :update, :destroy ]

  def create
    column = @board.columns.find_by(id: create_card_params[:column_id])

    if column.nil?
      render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found)
      return
    end

    next_position = (column.cards.maximum(:position) || -1) + 1
    @card = column.cards.new(team: @team, created_by_user_id: current_user.id, position: next_position)
    @card.title = title_or_default(create_card_params[:title])

    if @card.save
      render json: { card: card_json(@card) }, status: :created
    else
      render_error(ErrorCodes::Cards::CARD_CREATE_FAILED, :unprocessable_entity)
    end
  end

  def show
    render json: { card: card_json(@card) }
  end

  def update
    @card.title = update_card_params[:title] if update_card_params[:title].present?
    @card.description = update_card_params[:description] if update_card_params.key?(:description)

    if update_card_params[:column_id].present? || update_card_params.key?(:position)
      return unless move_card
    end

    if @card.save
      render json: { card: card_json(@card) }
    else
      render_error(ErrorCodes::Cards::CARD_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def destroy
    @card.destroy
    head :no_content
  end

  private

  def set_board
    @board = @team.boards.find_by(id: params[:board_id])

    render_error(ErrorCodes::Boards::BOARD_NOT_FOUND, :not_found) if @board.nil?
  end

  def set_card
    @card = @board.cards.find_by(id: params[:id])

    render_error(ErrorCodes::Cards::CARD_NOT_FOUND, :not_found) if @card.nil?
  end

  def move_card
    target_column = @board.columns.find_by(id: update_card_params[:column_id] || @card.column_id)

    if target_column.nil?
      render_error(ErrorCodes::Boards::COLUMN_NOT_FOUND, :not_found)
      return false
    end

    requested_position = update_card_params[:position]

    siblings = target_column.cards.where.not(id: @card.id).order(:position).to_a
    insert_at = requested_position.nil? ? siblings.length : requested_position.to_i.clamp(0, siblings.length)
    siblings.insert(insert_at, @card)

    siblings.each_with_index do |card, index|
      card.update_column(:position, index) if card.id != @card.id
    end

    @card.column = target_column
    @card.position = insert_at
    true
  end

  def card_json(card)
    {
      id: card.id,
      title: card.title,
      description: card.description,
      column_id: card.column_id,
      position: card.position,
      creator: member_json(card.creator),
      created_at: card.created_at,
      updated_at: card.updated_at
    }
  end
end
