class DiagramEditingChannel < ApplicationCable::Channel
  def subscribed
    stream_from "diagram_editing_#{params[:diagram_id]}"
  end

  def unsubscribed
    DiagramEditingStatus.stop(params[:diagram_id], current_user)
  end

  def start_editing
    DiagramEditingStatus.start(params[:diagram_id], current_user)
  end

  def stop_editing
    DiagramEditingStatus.stop(params[:diagram_id], current_user)
  end
end
