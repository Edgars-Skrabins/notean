class SessionsController < ApplicationController
  def create
    @user = User.find_by(email: user_params[:email]&.downcase)

    if @user&.authenticate(user_params[:password])
      token = JsonWebToken.encode(user_id: @user.id)
      render json: { user: @user.as_json(only: [ :id, :email ]), token: token, statusMessage: "Logged in successfully" }, status: :ok
    else
      render json: { statusMessage: "Invalid email or password" }, status: :unauthorized
    end
  end
end
