class DiagramEditingChannel < EditingChannel
  def self.status_class
    DiagramEditingStatus
  end

  def self.feature
    :diagrams
  end
end
