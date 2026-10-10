class Team < ApplicationRecord
  has_secure_password

  has_many :memberships, dependent: :destroy
  has_many :users, through: :memberships
  has_many :pages, dependent: :destroy
  has_many :diagrams, dependent: :destroy
  has_many :folders, dependent: :destroy
  has_many :boards, dependent: :destroy

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true

  before_validation :generate_code, on: :create

  private

  def generate_code
    self.code ||= loop do
      candidate = SecureRandom.alphanumeric(32)
      break candidate unless Team.exists?(code: candidate)
    end
  end
end
