class FoldersController < ApplicationController
  include FeatureGated

  DELETE_MODES = %w[cascade promote].freeze
  ITEM_TYPE_FEATURES = { "Page" => :pages, "Diagram" => :diagrams }.freeze

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_folder, only: [ :update, :destroy ]
  before_action :require_item_type_feature!

  def index
    folders = project_filtered(@team.folders.includes(creator: User::AVATAR_PRELOAD).where(item_type: index_item_type_param))
    return if folders.nil?

    render json: { folders: folders.map { |folder| folder_json(folder) } }
  end

  def create
    @folder = @team.folders.new(create_folder_params.except(:parent_id, :project_id))
    @folder.created_by_user_id = current_user.id
    return render_project_set_by_folder if project_with_parent?(create_folder_params)
    return unless place_in_folder(@folder, create_folder_params, :parent_id)

    if @folder.save
      render json: { folder: folder_json(@folder) }, status: :created
    else
      render_error(folder_error_code(ErrorCodes::Folders::FOLDER_CREATE_FAILED), :unprocessable_entity)
    end
  end

  def update
    @folder.title = update_folder_params[:title] if update_folder_params[:title].present?
    return render_project_set_by_folder if project_with_parent?(update_folder_params)
    return unless place_in_folder(@folder, update_folder_params, :parent_id)

    project_changed = @folder.project_id_changed?
    saved = Folder.transaction do
      raise ActiveRecord::Rollback unless @folder.save

      FolderProject.apply(@folder, @folder.project_id) if project_changed
      true
    end

    if saved
      render json: { folder: folder_json(@folder) }
    else
      render_error(folder_error_code(ErrorCodes::Folders::FOLDER_UPDATE_FAILED), :unprocessable_entity)
    end
  end

  def destroy
    unless DELETE_MODES.include?(params[:mode])
      render_error(ErrorCodes::Folders::FOLDER_DELETE_MODE_INVALID, :unprocessable_entity)
      return
    end

    if params[:mode] == "promote"
      @folder.children.update_all(parent_id: @folder.parent_id)
      @folder.pages.update_all(folder_id: @folder.parent_id)
      @folder.diagrams.update_all(folder_id: @folder.parent_id)
    end

    @folder.destroy
    head :no_content
  end

  private

  def set_folder
    @folder = project_access.scope(@team.folders).find_by(id: params[:id])

    render_error(ErrorCodes::Folders::FOLDER_NOT_FOUND, :not_found) if @folder.nil?
  end

  def project_with_parent?(folder_params)
    folder_params[:parent_id].present? && folder_params.key?(:project_id)
  end

  def render_project_set_by_folder
    render_error(ErrorCodes::Projects::PROJECT_SET_BY_FOLDER, :unprocessable_entity)
  end

  def require_item_type_feature!
    feature = ITEM_TYPE_FEATURES[@folder&.item_type || params[:item_type] || params.dig(:folder, :item_type)]
    require_feature!(feature) if feature
  end

  def folder_error_code(fallback)
    if @folder.errors.of_kind?(:parent_id, :type_mismatch)
      ErrorCodes::Folders::FOLDER_PARENT_TYPE_MISMATCH
    elsif @folder.errors.of_kind?(:parent_id, :circular)
      ErrorCodes::Folders::FOLDER_PARENT_CIRCULAR
    else
      fallback
    end
  end

  def index_item_type_param
    params.require(:item_type)
  end

  def folder_json(folder)
    {
      id: folder.id,
      title: folder.title,
      parent_id: folder.parent_id,
      project_id: folder.project_id,
      creator: member_json(folder.creator),
      created_at: folder.created_at,
      updated_at: folder.updated_at
    }
  end
end
