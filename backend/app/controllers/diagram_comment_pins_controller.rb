class DiagramCommentPinsController < ApplicationController
  include CommentJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:diagrams) }
  before_action :set_diagram, only: [ :index, :create ]
  before_action :set_pin, only: [ :update ]

  def index
    pins = @diagram.comment_pins.includes(creator: User::AVATAR_PRELOAD, resolver: User::AVATAR_PRELOAD).order(:id).to_a
    pin_comments = Comment.where(commentable_type: DiagramCommentPin.name, commentable_id: pins.map(&:id)).group(:commentable_id)
    counts = pin_comments.count
    first_comments = Comment.where(id: pin_comments.minimum(:id).values).includes(COMMENT_PRELOAD).index_by(&:commentable_id)

    render json: { comment_pins: pins.map { |pin| comment_pin_json(pin, counts[pin.id].to_i, first_comments[pin.id]) } }
  end

  def create
    pin = @diagram.comment_pins.new(team: @team, creator: current_user, x: create_comment_pin_params[:x], y: create_comment_pin_params[:y])
    comment = pin.comments.new(team: @team, creator: current_user, body: CommentBody.sanitize(create_comment_pin_params[:body]))

    if pin.valid? && comment.valid?
      pin.save!
      render json: { comment_pin: comment_pin_json(pin, 1, comment), comment: comment_json(comment) }, status: :created
    else
      render_error(comment_error_code(comment, ErrorCodes::Comments::COMMENT_CREATE_FAILED), :unprocessable_entity)
    end
  end

  def update
    resolved = ActiveModel::Type::Boolean.new.cast(update_comment_pin_params[:resolved])

    if @pin.update(resolved_at: resolved ? Time.current : nil, resolver: resolved ? current_user : nil)
      comments = @pin.comments
      render json: { comment_pin: comment_pin_json(@pin, comments.count, comments.includes(COMMENT_PRELOAD).order(:id).first) }
    else
      render_error(ErrorCodes::Comments::COMMENT_PIN_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  private

  def set_diagram
    @diagram = project_access.scope(@team.diagrams.without_content).find_by(id: params[:diagram_id])

    render_error(ErrorCodes::Diagrams::DIAGRAM_NOT_FOUND, :not_found) if @diagram.nil?
  end

  def set_pin
    @pin = DiagramCommentPin.where(diagram: project_access.scope(@team.diagrams)).find_by(id: params[:id])

    render_error(ErrorCodes::Comments::COMMENT_PIN_NOT_FOUND, :not_found) if @pin.nil?
  end

  def comment_pin_json(pin, comment_count, first_comment)
    {
      id: pin.id,
      x: pin.x,
      y: pin.y,
      resolved_at: pin.resolved_at,
      resolved_by: pin.resolver && member_json(pin.resolver),
      created_by: member_json(pin.creator),
      comment_count: comment_count,
      first_comment: first_comment && comment_json(first_comment)
    }
  end
end
