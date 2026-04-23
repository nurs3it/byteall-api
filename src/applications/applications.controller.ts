import {
  Controller, Post, Body, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Submit a job application (public)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        vacancyId: { type: 'string' },
        coverLetter: { type: 'string' },
        resume: { type: 'string', format: 'binary' },
      },
      required: ['firstName', 'lastName', 'email'],
    },
  })
  submit(
    @Body() dto: CreateApplicationDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.applicationsService.submitApplication(dto, file);
  }
}
