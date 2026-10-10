class PageEditingChannel < ApplicationCable::Channel
  def subscribed
    stream_from "page_editing_#{params[:page_id]}"
  end

  def unsubscribed
    PageEditingStatus.stop(params[:page_id], current_user)
  end

  def start_editing
    PageEditingStatus.start(params[:page_id], current_user)
  end

  def stop_editing
    PageEditingStatus.stop(params[:page_id], current_user)
  end
end
