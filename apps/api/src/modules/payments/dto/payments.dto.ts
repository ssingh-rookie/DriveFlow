import { ApiProperty } from '@nestjs/swagger'

export class StripeConnectLinkDto {
  @ApiProperty({ example: 'https://stripe.com/onboard/test' })
  onboardingLink: string
}

export class StripeAccountStatusDto {
  @ApiProperty({ enum: ['Not Started', 'Pending', 'Restricted', 'Complete'] })
  status: 'Not Started' | 'Pending' | 'Restricted' | 'Complete'

  @ApiProperty({ example: ['external_account', 'person.dob.year'] })
  requirements: string[]
}
