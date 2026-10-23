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
    folders = @team.folders.includes(creator: User::AVATAR_PRELOAD).where(item_type: index_item_type_param).to_a
    items = index_item_type_param == "Page" ? @team.pages : @team.diagrams
    matching_items = project_filtered(items)
    return if matching_items.nil?

    visible_ids = FolderVisibility.new(
      folders,
      item_folder_ids: items.where.not(folder_id: nil).pluck(:folder_id),
      matching_folder_ids: matching_items.where.not(folder_id: nil).pluck(:folder_id),
      include_empty: params[:project_id].blank?
    ).visible_ids

    render json: { folders: folders.select { |folder| visible_ids.include?(folder.id) }.map { |folder| folder_json(folder) } }
  end

  def create
    @folder = @team.folders.new(create_folder_params)
    @folder.created_by_user_id = current_user.id

    if @folder.save
      render json: { folder: folder_json(@folder) }, status: :created
    else
      render_error(folder_error_code(ErrorCodes::Folders::FOLDER_CREATE_FAILED), :unprocessable_entity)
    end
  end

  def update
    @folder.title = update_folder_params[:title] if update_folder_params[:title].present?
    @folder.parent_id = update_folder_params[:parent_id] if update_folder_params.key?(:parent_id)

    if @folder.save
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
    @folder = @team.folders.find_by(id: params[:id])

    render_error(ErrorCodes::Folders::FOLDER_NOT_FOUND, :not_found) if @folder.nil?
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
      creator: member_json(folder.creator),
      created_at: folder.created_at,
      updated_at: folder.updated_at
    }
  end
end
