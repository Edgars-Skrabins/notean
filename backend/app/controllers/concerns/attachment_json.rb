module AttachmentJson
  extend ActiveSupport::Concern

  ATTACHMENT_PRELOAD = [ { file_attachment: :blob }, { creator: User::AVATAR_PRELOAD } ].freeze

  private

  def attachment_json(attachment)
    {
      id: attachment.id,
      filename: attachment.file.filename.to_s,
      content_type: attachment.file.content_type,
      byte_size: attachment.byte_size,
      kind: attachment.kind,
      uploader: member_json(attachment.creator),
      created_at: attachment.created_at
    }
  end

  def attachments_json(attachable)
    attachable.attachments.files.newest_first.includes(ATTACHMENT_PRELOAD).map { |attachment| attachment_json(attachment) }
  end

  def save_uploaded_attachment(attachable, kind)
    file = attachment_params[:file]
    return render_error(ErrorCodes::Attachments::FILE_REQUIRED, :unprocessable_entity) unless file.respond_to?(:read)

    attachment = Attachment.new(team: @team, attachable: attachable, kind: kind, creator: current_user)
    attachment.file.attach(file)

    if attachment.invalid?
      render_error(upload_error_code(attachment), :unprocessable_entity)
    elsif !Attachment.fits_quota?(@team, attachment.byte_size)
      render_error(ErrorCodes::Attachments::STORAGE_QUOTA_EXCEEDED, :unprocessable_entity)
    elsif attachment.save
      attachment
    else
      render_error(ErrorCodes::Attachments::ATTACHMENT_UPLOAD_FAILED, :unprocessable_entity)
    end
  end

  def upload_error_code(attachment)
    if attachment.errors.of_kind?(:file, :too_large)
      ErrorCodes::Attachments::FILE_TOO_LARGE
    elsif attachment.errors.of_kind?(:kind, :inline_image_type)
      ErrorCodes::Attachments::INLINE_IMAGE_TYPE_INVALID
    else
      ErrorCodes::Attachments::ATTACHMENT_UPLOAD_FAILED
    end
  end

  def can_delete_attachment?(attachment)
    attachment.created_by_user_id == current_user.id || project_access.manager?
  end
end
