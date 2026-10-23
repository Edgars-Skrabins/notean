module FeatureGated
  extend ActiveSupport::Concern

  private

  def require_feature!(feature)
    render_error(ErrorCodes::Teams::FEATURE_DISABLED, :forbidden) unless @team.feature_enabled?(feature)
  end
end
