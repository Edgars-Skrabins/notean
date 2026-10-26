class SessionsController < ApplicationController
  before_action :authenticate_user!, only: [ :destroy, :cable_ticket ]

  def create
    @user = User.active.find_by(email: user_params[:email]&.downcase)

    if @user&.authenticate(user_params[:password])
      @user.user_sessions.where("last_used_at <= ?", UserSession::IDLE_EXPIRY.ago).delete_all
      render json: { user: @user.as_json(only: [ :id, :email ]), token: start_session(@user) }, status: :ok
    else
      render_error(ErrorCodes::Auth::INVALID_CREDENTIALS, :unauthorized)
    end
  end

  def destroy
    @current_session.destroy
    head :no_content
  end

  def cable_ticket
    render json: { ticket: JsonWebToken.encode({ session_id: @current_session.id, purpose: "cable" }, 1.minute.from_now) }
  end
end
