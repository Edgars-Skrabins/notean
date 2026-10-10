class UsersController < ApplicationController
  before_action :authenticate_user!, only: [:settings, :update_settings]

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

  def settings
    render json: { settings: settings_json(current_user), statusMessage: 'Settings found' }
  end

  def update_settings
    if current_user.update(update_settings_params)
      render json: { settings: settings_json(current_user), statusMessage: 'Settings updated' }
    else
      render json: { statusMessage: 'Failed to update settings' }, status: :unprocessable_entity
    end
  end

  private

  def settings_json(user)
    {
      show_favorites_on_home: user.show_favorites_on_home,
      show_favorites_in_sidebar: user.show_favorites_in_sidebar
    }
  end
end
