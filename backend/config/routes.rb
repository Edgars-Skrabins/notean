Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  get "teams/mine" => "teams#mine"
  get "teams/mine/all" => "teams#mine_all"
  post "teams/:code/activate" => "teams#activate"
  get "teams/:code/members" => "teams#members"
  delete "teams/:code/members/:user_id" => "members#destroy"
  patch "teams/:code/members/:user_id/role" => "members#update_role"
  post "teams/:code/transfer_ownership" => "members#transfer_ownership"
  post "teams/:code/leave" => "members#leave"
  patch "teams/:code/nickname" => "teams#update_nickname"
  patch "teams/:code/features" => "teams#update_features"
  get "users/me" => "users#me"
  delete "users/me" => "users#destroy"
  patch "users/me/settings" => "users#update_settings"
  patch "users/me/avatar" => "users#update_avatar"
  patch "users/me/password" => "users#update_password"
  resources :teams, only: [ :create, :update, :destroy ], param: :code do
    resources :folders, only: [ :index, :create, :update, :destroy ]
    resources :pages, only: [ :index, :create, :show, :update, :destroy ] do
      resources :comments, only: [ :index, :create ]
    end
    resources :diagrams, only: [ :index, :create, :show, :update, :destroy ] do
      resources :comment_pins, only: [ :index, :create ], controller: "diagram_comment_pins"
    end
    resources :comment_pins, only: [ :update ], controller: "diagram_comment_pins" do
      resources :comments, only: [ :index, :create ]
    end
    resources :comments, only: [ :update, :destroy ]
    resources :boards, only: [ :index, :create, :show, :update, :destroy ] do
      get :overview, on: :member
      resources :columns, only: [ :create, :update, :destroy ]
      resources :priorities, only: [ :create, :update, :destroy ]
      resources :tags, only: [ :create, :update, :destroy ]
      resources :tickets, only: [ :index, :create, :show, :update, :destroy ] do
        collection do
          patch :bulk, action: :bulk_update
          delete :bulk, action: :bulk_destroy
        end
        resources :assignees, only: [ :create, :destroy ], controller: "ticket_assignees", param: :user_id
        resources :tags, only: [ :create, :destroy ], controller: "ticket_tags", param: :tag_id
        resources :comments, only: [ :index, :create ]
      end
    end
    resources :templates, only: [ :index, :create, :show, :update, :destroy ]
    resources :favorites, only: [ :index, :create, :update, :destroy ]
    resources :trash, only: [ :index, :destroy ], controller: "trash" do
      collection do
        post :restore
        delete "/", action: :empty
      end
    end
    get :my_work, to: "my_work#index"
    get :search, to: "search#index"
    resources :projects, only: [ :index, :create, :show, :update, :destroy ] do
      get :options, on: :collection
    end
  end

  post "actions/jointeam" => "actions#join_team"

  post "auth/register" => "users#create"
  post "auth/login" => "sessions#create"
  delete "auth/session" => "sessions#destroy"
  post "auth/cable_ticket" => "sessions#cable_ticket"

  mount ActionCable.server => "/cable"
end
