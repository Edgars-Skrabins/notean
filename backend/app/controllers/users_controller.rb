class UsersController < ApplicationController
  before_action :authenticate_user!, only: [:settings, :update_settings, :avatar, :update_avatar]

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

  def avatar
    render json: { avatar: avatar_json(current_user), statusMessage: 'Avatar found' }
  end

  def update_avatar
    color = update_avatar_params[:color]
    image = update_avatar_params[:image]

    if color.present? && !User::AVATAR_COLORS.include?(color)
      render json: { statusMessage: 'Invalid color' }, status: :unprocessable_entity
      return
    end

    current_user.avatar_color = color if color.present?
    current_user.avatar_image = image if image.present?

    if current_user.save
      current_user.avatar_image.purge if image.blank? && update_avatar_params[:remove_image] == 'true'
      render json: { avatar: avatar_json(current_user), statusMessage: 'Avatar updated' }
    else
      render json: { statusMessage: 'Invalid image' }, status: :unprocessable_entity
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
