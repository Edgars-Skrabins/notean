class CommentsController < ApplicationController
  include CommentJson

  FEATURES = { "Ticket" => :boards, "Page" => :pages, "DiagramCommentPin" => :diagrams }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_commentable, only: [ :index, :create ]
  before_action :set_comment, only: [ :update, :destroy ]

  def index
    comments = @commentable.comments.includes(COMMENT_PRELOAD).order(id: :desc)
    comments = comments.where(id: ...params[:before_id].to_i) if params[:before_id].present?
    records = comments.limit(PAGE_SIZE + 1).to_a

    render json: { comments: records.first(PAGE_SIZE).map { |comment| comment_json(comment) }, has_more: records.length > PAGE_SIZE }
  end

  def create
    comment = @commentable.comments.new(team: @team, creator: current_user, body: CommentBody.sanitize(create_comment_params[:body]))

    if comment.save
      render json: { comment: comment_json(comment) }, status: :created
    else
      render_error(comment_error_code(comment, ErrorCodes::Comments::COMMENT_CREATE_FAILED), :unprocessable_entity)
    end
  end

  def update
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless @comment.created_by_user_id == current_user.id

    if @comment.update(body: CommentBody.sanitize(update_comment_params[:body]))
      render json: { comment: comment_json(@comment) }
    else
      render_error(comment_error_code(@comment, ErrorCodes::Comments::COMMENT_UPDATE_FAILED), :unprocessable_entity)
    end
  end

  def destroy
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless @comment.created_by_user_id == current_user.id || project_access.manager?

    commentable = @comment.commentable
    @comment.destroy

    if commentable.is_a?(DiagramCommentPin) && !commentable.comments.exists?
      commentable.destroy
      render json: { comment_pin_deleted: true }
    else
      head :no_content
    end
  end

  private

  def set_commentable
    feature, @commentable, not_found_code = find_commentable

    if !@team.feature_enabled?(feature)
      render_error(ErrorCodes::Teams::FEATURE_DISABLED, :forbidden)
    elsif @commentable.nil?
      render_error(not_found_code, :not_found)
    end
  end

  def find_commentable
    if params[:ticket_id]
      board = project_access.scope(@team.boards).find_by(id: params[:board_id])
      return [ :boards, nil, ErrorCodes::Boards::BOARD_NOT_FOUND ] if board.nil?

      [ :boards, board.tickets.without_description.find_by(id: params[:ticket_id]), ErrorCodes::Tickets::TICKET_NOT_FOUND ]
    elsif params[:page_id]
      [ :pages, project_access.scope(@team.pages.without_content).find_by(id: params[:page_id]), ErrorCodes::Pages::PAGE_NOT_FOUND ]
    else
      pins = DiagramCommentPin.where(diagram: project_access.scope(@team.diagrams))
      [ :diagrams, pins.find_by(id: params[:comment_pin_id]), ErrorCodes::Comments::COMMENT_PIN_NOT_FOUND ]
    end
  end

  def set_comment
    @comment = Comment.where(team: @team).includes(COMMENT_PRELOAD).find_by(id: params[:id])

    if @comment.nil?
      render_error(ErrorCodes::Comments::COMMENT_NOT_FOUND, :not_found)
    elsif !@team.feature_enabled?(FEATURES[@comment.commentable_type])
      render_error(ErrorCodes::Teams::FEATURE_DISABLED, :forbidden)
    elsif (item = commented_item(@comment.commentable)).nil? || !project_access.visible?(item)
      render_error(ErrorCodes::Comments::COMMENT_NOT_FOUND, :not_found)
    end
  end

  def commented_item(commentable)
    commentable.is_a?(DiagramCommentPin) ? commentable.diagram : commentable
  end
end
