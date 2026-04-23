import { Controller, Post, Body } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@SkipThrottle()
@Controller('inquiries')
export class InquiriesController {
  constructor(private service: InquiriesService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  create(@Body() dto: CreateInquiryDto) {
    return this.service.create(dto);
  }
}
