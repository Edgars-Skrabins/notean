class SessionsController < ApplicationController
  def create
    @user = User.find_by(email: user_params[:email]&.downcase)

    if @user&.authenticate(user_params[:password])
      token = JsonWebToken.encode(user_id: @user.id)
      render json: { user: @user.as_json(only: [ :id, :email ]), token: token }, status: :ok
    else
      render_error(ErrorCodes::Auth::INVALID_CREDENTIALS, :unauthorized)
    end
  end
end
