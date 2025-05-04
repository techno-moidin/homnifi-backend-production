import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { TwoAccessService } from './two-access.service';
import ApiResponse from '../utils/api-response.util';
import {
  FindPaginatedDto,
  FindByIdDto,
  FindByEmailDto,
  SearchDto,
  FindByStatusDto,
  FindByNameDto,
  FindByDateRangeDto,
  FindAllDto,
  FindActiveDto,
} from './dto/two-access.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// @UseGuards(JwtAuthGuard)
@Controller('two-access')
export class TwoAccessController {
  constructor(private twoAccessService: TwoAccessService) {}

  // Get all users
  @Get('all')
  async findAllTwoAccessUsers() {
    const result = await this.twoAccessService.findAllTwoAccessUsers(
      new FindAllDto(),
    );
    return new ApiResponse(result);
  }

  // Get users with pagination
  @Get('paginated')
  async findPaginatedTwoAccessUsers(@Query() query: FindPaginatedDto) {
    const result =
      await this.twoAccessService.findWithPaginationTwoAccessUsers(query);
    return new ApiResponse(result);
  }

  // Get user by ID
  @Get('bid/:id')
  async findOneTwoAccessUsers(@Param() params: FindByIdDto) {
    const result = await this.twoAccessService.findByIdTwoAccessUsers(
      params.id,
    );
    return new ApiResponse(result);
  }

  // Get user by email
  @Get('email/:email')
  async findByEmailTwoAccessUsers(
    @Req() req: any,
    @Param() params: FindByEmailDto,
  ) {
    const result =
      await this.twoAccessService.findByEmailTwoAccessUsers(params);
    return new ApiResponse(result);
  }

  // Get users by date range
  @Get('date-range')
  async findByDateRangeTwoAccessUsers(@Query() query: FindByDateRangeDto) {
    const result =
      await this.twoAccessService.findByDateRangeTwoAccessUsers(query);
    return new ApiResponse(result);
  }

  @Get('search')
  async searchTwoAccessUsers(@Query() query: SearchDto) {
    console.log(query, 'search');

    const result = await this.twoAccessService.searchTwoAccessUsers(
      query.query,
    );
    return new ApiResponse(result);
  }
}
