import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ApiResponse from '../utils/api-response.util';
import { SupernodeLeaderService } from './supernode.leaderboard.service';
import { LeaderBoardDto } from './dto/leader-board.dto';
import { GraphTimelineDto } from './dto/graph-query.dto';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class SupernodeLeaderBoardController {
  constructor(
    private readonly supernodeLeaderService: SupernodeLeaderService,
  ) {}

  @Get('get-Leaders-by-type')
  async getAllTopLeadersForGraph(
    @Query() graphTimelineDto: GraphTimelineDto,
    @Query() leaderBoardDto: LeaderBoardDto,
  ) {
    const { timeline } = graphTimelineDto;
    const { type } = leaderBoardDto;
    const result = await this.supernodeLeaderService.getAllTopLeadersForGraph(
      type,
      timeline,
    );
    return new ApiResponse(result);
  }

  @Get('get-top-leaders')
  async getAllTopLeaders(@Query() leaderboard: LeaderBoardDto) {
    const { type, filter, query, limit, page } = leaderboard;
    const result = await this.supernodeLeaderService.getAllTopLeadersv1(
      type,
      filter,
      query,
      limit,
      page,
    );
    return new ApiResponse(result);
  }
}
