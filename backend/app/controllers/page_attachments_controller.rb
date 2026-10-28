class PageAttachmentsController < ApplicationController
  include AttachmentJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:pages) }
  before_action :set_page

  def create
    attachment = save_uploaded_attachment(@page, attachment_params[:kind].presence || "file")
    return unless attachment.is_a?(Attachment)

    render json: { attachment: attachment_json(attachment) }, status: :created
  end

  def destroy
    attachment = @page.attachments.files.find_by(id: params[:id])
    return render_error(ErrorCodes::Attachments::ATTACHMENT_NOT_FOUND, :not_found) if attachment.nil?
    return render_error(ErrorCodes::Common::FORBIDDEN, :forbidden) unless can_delete_attachment?(attachment)

    attachment.destroy
    head :no_content
  end

  private

  def set_page
    @page = project_access.scope(@team.pages).find_by(id: params[:page_id])

    render_error(ErrorCodes::Pages::PAGE_NOT_FOUND, :not_found) if @page.nil?
  end
end
