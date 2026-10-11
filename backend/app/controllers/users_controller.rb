class UsersController < ApplicationController
  before_action :authenticate_user!, only: [ :me, :update_settings, :update_avatar ]

  def create
    if User.exists?(email: user_params[:email])
      render_error(ErrorCodes::Auth::EMAIL_TAKEN, :conflict)
      return
    end

    @user = User.new(user_params)

    if @user.save
      token = JsonWebToken.encode(user_id: @user.id)
      render json: { user: @user.as_json(only: [ :id, :email ]), token: token }, status: :created
    else
      render_error(ErrorCodes::Auth::REGISTRATION_FAILED, :unprocessable_entity)
    end
  end

  def me
    render json: {
      user: current_user.as_json(only: [ :id, :email ]),
      settings: settings_json(current_user),
      avatar: avatar_json(current_user),
      team: active_team_json(current_user)
    }
  end

  def update_settings
    if current_user.update(update_settings_params)
      render json: { settings: settings_json(current_user) }
    else
      render_error(ErrorCodes::Users::SETTINGS_UPDATE_FAILED, :unprocessable_entity)
    end
  end

  def update_avatar
    color = update_avatar_params[:color]
    image = update_avatar_params[:image]

    if color.present? && !User::AVATAR_COLORS.include?(color)
      render_error(ErrorCodes::Users::AVATAR_COLOR_INVALID, :unprocessable_entity)
      return
    end

    current_user.avatar_color = color if color.present?
    current_user.avatar_image = image if image.present?

    if current_user.save
      current_user.avatar_image.purge if image.blank? && update_avatar_params[:remove_image] == "true"
      render json: { avatar: avatar_json(current_user) }
    else
      render_error(ErrorCodes::Users::AVATAR_IMAGE_INVALID, :unprocessable_entity)
    end
  end

  private

  def active_team_json(user)
    membership = active_membership(user)
    membership && { team: team_json(membership.team), role: membership.role, nickname: membership.nickname }
  end

  def settings_json(user)
    {
      show_favorites_on_home: user.show_favorites_on_home,
      show_favorites_in_sidebar: user.show_favorites_in_sidebar,
      show_my_work_on_home: user.show_my_work_on_home
    }
  end
end
