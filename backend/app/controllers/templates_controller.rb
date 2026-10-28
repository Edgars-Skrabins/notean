class TemplatesController < ApplicationController
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_template, only: [ :show, :update, :destroy ]
  before_action :require_manage!, only: [ :update, :destroy ]

  def index
    return unless require_kind!(params[:kind])

    templates = @team.templates.without_content.where(kind: params[:kind]).includes(creator: User::AVATAR_PRELOAD)
    templates, has_more = paginate(templates.search_title(params[:search]).order(Arel.sql("LOWER(title)"), :id))
    render json: { templates: templates.map { |template| template_summary_json(template) }, has_more: has_more }
  end

  def create
    return unless require_kind!(create_template_params[:kind])

    @template = @team.templates.new(created_by_user_id: current_user.id, kind: create_template_params[:kind])
    @template.title = title_or_default(create_template_params[:title])
    @template.content = template_content(create_template_params[:content])

    if @template.save
      render json: { template: template_json(@template) }, status: :created
    else
      render_template_error(ErrorCodes::Templates::TEMPLATE_CREATE_FAILED)
    end
  end

  def show
    render json: { template: template_json(@template) }
  end

  def update
    return unless assign_lock_version(@template, update_template_params, :title, :content)

    @template.title = update_template_params[:title] if update_template_params[:title].present?
    @template.content = template_content(update_template_params[:content]) if update_template_params.key?(:content)

    if @template.save
      render json: { template: template_json(@template) }
    else
      render_template_error(ErrorCodes::Templates::TEMPLATE_UPDATE_FAILED)
    end
  rescue ActiveRecord::StaleObjectError
    render_error(ErrorCodes::Common::EDIT_CONFLICT, :conflict, extra: { template: template_json(@team.templates.find(@template.id)) })
  end

  def destroy
    @template.destroy
    head :no_content
  end

  private

  def set_template
    @template = @team.templates.includes(creator: User::AVATAR_PRELOAD).find_by(id: params[:id])

    if @template.nil?
      render_error(ErrorCodes::Templates::TEMPLATE_NOT_FOUND, :not_found)
    else
      require_feature!(feature_for(@template.kind))
    end
  end

  def require_kind!(kind)
    unless Template::KINDS.include?(kind)
      render_error(ErrorCodes::Templates::TEMPLATE_KIND_INVALID, :unprocessable_entity)
      return false
    end

    require_feature!(feature_for(kind))
    !performed?
  end

  def require_manage!
    render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless can_manage?(@template)
  end

  def feature_for(kind)
    "#{kind}s"
  end

  def can_manage?(template)
    template.created_by_user_id == current_user.id || %w[admin owner].include?(current_role)
  end

  def current_role
    @current_role ||= membership_for(@team)&.role
  end

  def template_content(content)
    return content.to_s unless @template.kind == "page"

    Rails::Html::SafeListSanitizer.new.sanitize(content.to_s)
  end

  def render_template_error(fallback_code)
    code = limit_error_code(@template)
    code ||= ErrorCodes::Templates::TEMPLATE_CONTENT_INVALID if @template.errors.of_kind?(:content, :invalid)
    render_error(code || fallback_code, :unprocessable_entity)
  end

  def template_summary_json(template)
    {
      id: template.id,
      kind: template.kind,
      title: template.title,
      lock_version: template.lock_version,
      can_manage: can_manage?(template),
      creator: member_json(template.creator),
      created_at: template.created_at,
      updated_at: template.updated_at
    }
  end

  def template_json(template)
    template_summary_json(template).merge(content: template.content)
  end
end
