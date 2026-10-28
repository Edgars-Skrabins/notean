class PageAttachments
  def initialize(page, user, project_access, pending_file_ids: [])
    @page = page
    @user = user
    @project_access = project_access
    @pending_file_ids = Array(pending_file_ids)
    @claims = []
    @kept_ids = []
    @template_ids = []
  end

  def prepare
    fragment = Loofah.html4_fragment(@page.content.to_s)
    images = fragment.css("img[data-attachment-id]")
    attachments = @page.team.attachments.includes(file_attachment: :blob).where(id: images.map { |image| image["data-attachment-id"] }).index_by(&:id)
    copies = {}
    changed = false

    images.each do |image|
      attachment = attachments[image["data-attachment-id"].to_i]
      case classify(attachment)
      when :own then @kept_ids << attachment.id
      when :claim then @claims << attachment
      when :template then @template_ids << attachment.id
      when :copy then copies[image] = attachment.copy_for(nil, @user).tap { |copy| copy.kind = "inline" }
      else
        image.remove
        changed = true
      end
    end

    return false unless Attachment.fits_quota?(@page.team, copies.values.sum(&:byte_size))

    copies.each do |image, copy|
      copy.save!
      image["data-attachment-id"] = copy.id.to_s
      @claims << copy
      changed = true
    end

    @page.content = fragment.to_html if changed
    true
  end

  def finish
    claimed_ids = @claims.map(&:id) + @page.team.attachments.pending.files.where(created_by_user_id: @user.id, id: @pending_file_ids).pluck(:id)
    Attachment.where(id: claimed_ids).update_all(attachable_type: "Page", attachable_id: @page.id, updated_at: Time.current)

    @page.attachments.inline.where.not(id: @kept_ids + claimed_ids).find_each(&:destroy)
    @page.attachment_references.where.not(attachment_id: @template_ids).delete_all
    @template_ids.each { |id| AttachmentReference.find_or_create_by!(attachment_id: id, page_id: @page.id) }
  end

  private

  def classify(attachment)
    return nil if attachment.nil?

    if attachment.attachable_type == "Page" && attachment.attachable_id == @page.id && @page.persisted?
      attachment.kind == "inline" ? :own : nil
    elsif attachment.pending?
      :claim if attachment.created_by_user_id == @user.id && attachment.kind == "inline"
    elsif attachment.template?
      :template
    elsif attachment.image? && @project_access.attachment_visible?(attachment)
      :copy
    end
  end
end
