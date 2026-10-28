class AttachmentsController < ApplicationController
  include AttachmentJson
  include FeatureGated

  before_action :authenticate_user!
  before_action :set_team
  before_action :authorize_team_member!
  before_action -> { require_feature!(:pages) }, only: [ :create ]
  before_action :set_attachment, only: [ :destroy, :file ]

  def create
    kind = attachment_params[:kind].presence || "file"
    attachment = save_uploaded_attachment(nil, kind)
    return unless attachment.is_a?(Attachment)

    render json: { attachment: attachment_json(attachment) }, status: :created
  end

  def destroy
    return render_error(ErrorCodes::Attachments::ATTACHMENT_NOT_FOUND, :not_found) unless @attachment.pending?

    @attachment.destroy
    head :no_content
  end

  def file
    blob = @attachment.file.blob
    disposition = @attachment.image? ? "inline" : "attachment"
    response.headers["X-Content-Type-Options"] = "nosniff"
    send_data blob.download, filename: blob.filename.to_s, type: @attachment.image? ? blob.content_type : "application/octet-stream", disposition: disposition
  end

  private

  def set_attachment
    @attachment = @team.attachments.includes(file_attachment: :blob).find_by(id: params[:id])

    render_error(ErrorCodes::Attachments::ATTACHMENT_NOT_FOUND, :not_found) unless @attachment && project_access.attachment_visible?(@attachment)
  end
end
