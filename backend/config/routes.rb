Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  get "teams/mine" => "teams#mine"
  get "teams/mine/all" => "teams#mine_all"
  post "teams/:code/activate" => "teams#activate"
  get "teams/:code/members" => "teams#members"
  patch "teams/:code/nickname" => "teams#update_nickname"
  get "users/me/settings" => "users#settings"
  patch "users/me/settings" => "users#update_settings"
  get "users/me/avatar" => "users#avatar"
  patch "users/me/avatar" => "users#update_avatar"
  resources :teams, only: [:create, :show, :update, :destroy], param: :code do
    resources :folders, only: [:index, :create, :update, :destroy]
    resources :pages, only: [:index, :create, :show, :update, :destroy]
    resources :diagrams, only: [:index, :create, :show, :update, :destroy]
    resources :boards, only: [:index, :create, :show, :update, :destroy] do
      resources :columns, only: [:create, :update, :destroy]
      resources :cards, only: [:create, :show, :update, :destroy]
    end
    resources :favorites, only: [:index, :create, :update, :destroy]
  end

  post "actions/jointeam" => "actions#join_team"

  post "auth/register" => "users#create"
  post "auth/login" => "sessions#create"

  mount ActionCable.server => "/cable"
end
