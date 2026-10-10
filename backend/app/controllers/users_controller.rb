class UsersController < ApplicationController
  def create
    if User.exists?(email: user_params[:email])
      render json: { statusMessage: 'User with this email already exists' }, status: :conflict
      return
    end

    @user = User.new(user_params)

    if @user.save
      token = JsonWebToken.encode(user_id: @user.id)
      render json: { user: @user.as_json(only: [:id, :email]), token: token, statusMessage: 'User created successfully' }, status: :created
    else
      render json: { statusMessage: 'Failed to create user' }, status: :unprocessable_entity
    end
  end
end
