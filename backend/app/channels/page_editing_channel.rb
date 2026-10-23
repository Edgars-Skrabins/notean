class PageEditingChannel < EditingChannel
  def self.status_class
    PageEditingStatus
  end

  def self.feature
    :pages
  end
end
