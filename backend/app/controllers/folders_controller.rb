class FoldersController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action :set_folder, only: [ :update, :destroy ]

  def index
    folders = @team.folders.where(item_type: index_item_type_param)

    render json: { folders: folders.map { |folder| folder_json(folder) }, statusMessage: "Folders found" }
  end

  def create
    @folder = @team.folders.new(create_folder_params)
    @folder.created_by_user_id = current_user.id

    if @folder.save
      render json: { folder: folder_json(@folder), statusMessage: "Folder created successfully" }, status: :created
    else
      render json: { statusMessage: @folder.errors.full_messages.to_sentence.presence || "Failed to create folder" }, status: :unprocessable_entity
    end
  end

  def update
    @folder.title = update_folder_params[:title] if update_folder_params[:title].present?
    @folder.parent_id = update_folder_params[:parent_id] if update_folder_params.key?(:parent_id)

    if @folder.save
      render json: { folder: folder_json(@folder), statusMessage: "Folder updated successfully" }
    else
      render json: { statusMessage: @folder.errors.full_messages.to_sentence.presence || "Failed to update folder" }, status: :unprocessable_entity
    end
  end

  def destroy
    unless %w[cascade promote].include?(params[:mode])
      render json: { statusMessage: "mode must be cascade or promote" }, status: :unprocessable_entity
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

  def set_team
    @team = Team.find_by(code: params[:team_code])

    render json: { statusMessage: "Team not found" }, status: :not_found if @team.nil?
  end

  def authorize_team_member!
    render json: { statusMessage: "Forbidden" }, status: :forbidden unless current_user.memberships.exists?(team: @team)
  end

  def set_folder
    @folder = @team.folders.find_by(id: params[:id])

    render json: { statusMessage: "Folder not found" }, status: :not_found if @folder.nil?
  end

  def index_item_type_param
    params.require(:item_type)
  end

  def folder_json(folder)
    {
      id: folder.id,
      title: folder.title,
      parent_id: folder.parent_id,
      creator: user_json(folder.creator),
      created_at: folder.created_at,
      updated_at: folder.updated_at
    }
  end

  def user_json(user)
    { id: user.id, nickname: team_nicknames[user.id] }
  end
end
