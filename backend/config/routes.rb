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
  get "teams/:code/storage_usage" => "teams#storage_usage"
  get "users/me" => "users#me"
  delete "users/me" => "users#destroy"
  patch "users/me/settings" => "users#update_settings"
  patch "users/me/avatar" => "users#update_avatar"
  patch "users/me/password" => "users#update_password"
  resources :teams, only: [ :create, :update, :destroy ], param: :code do
    resources :folders, only: [ :index, :create, :update, :destroy ]
    resources :pages, only: [ :index, :create, :show, :update, :destroy ] do
      resources :comments, only: [ :index, :create ]
      resources :attachments, only: [ :create, :destroy ], controller: "page_attachments"
    end
    resources :diagrams, only: [ :index, :create, :show, :update, :destroy ] do
      resources :comment_pins, only: [ :index, :create ], controller: "diagram_comment_pins"
    end
    resources :comment_pins, only: [ :update ], controller: "diagram_comment_pins" do
      resources :comments, only: [ :index, :create ]
    end
    resources :comments, only: [ :update, :destroy ]
    resources :attachments, only: [ :create, :destroy ] do
      get :file, on: :member
    end
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
        resources :attachments, only: [ :create, :destroy ], controller: "ticket_attachments"
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
    resources :notifications, only: [ :index, :update ] do
      get :unread_count, on: :collection
      post :read_all, on: :collection
    end
    get :my_work, to: "my_work#index"
    get :search, to: "search#index"
    get "mentions/search", to: "mentions#search"
    post "mentions/resolve", to: "mentions#resolve"
    resources :chat_channels, only: [ :index, :create, :show, :update, :destroy ] do
      member do
        post :leave
        post :read
      end
      resources :gifs, only: [ :index ], controller: "chat_gifs"
      resources :messages, only: [ :index, :create, :update, :destroy ], controller: "chat_messages" do
        resource :reactions, only: [ :create, :destroy ], controller: "chat_reactions"
      end
    end
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
