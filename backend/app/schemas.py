from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator

class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: SecretStr
    confirm_password: SecretStr
    terms_accepted: bool = True
    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value):
        value = " ".join(value.split())
        if len(value) < 2: raise ValueError("Enter your full name")
        return value

class LoginIn(BaseModel):
    email: EmailStr
    password: SecretStr

class DemoIdentityIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    @field_validator("full_name")
    @classmethod
    def clean_demo_name(cls, value):
        value = " ".join(value.split())
        if len(value) < 2: raise ValueError("Enter your full name")
        return value

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    profile_image: str | None
    email_verified: bool
    model_config = ConfigDict(from_attributes=True)

class FeedbackIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)
    rating: int | None = Field(default=None, ge=1, le=5)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class CampaignIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    channels: str = Field(min_length=1, max_length=255)
    spent: int = Field(default=0, ge=0)
    leads: int = Field(default=0, ge=0)
    roi: int = Field(default=0)
    status: str = Field(default="active", pattern="^(active|completed)$")

class CampaignOut(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    channels: str
    spent: int
    leads: int
    roi: int
    status: str
    model_config = ConfigDict(from_attributes=True)

class OnboardingIn(BaseModel):
    business_name: str = Field(min_length=1, max_length=200)
    goals: list[str] = Field(default_factory=list)
    channels: list[str] = Field(default_factory=list)

class OnboardingOut(BaseModel):
    id: int
    user_id: int | None = None
    business_name: str
    goals: list[str]
    channels: list[str]
    model_config = ConfigDict(from_attributes=True)
