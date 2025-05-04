import { CHART_TIMELIME_TYPES } from '@/src/myfriends/enums/chart-timelines.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class GraphQueryDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(CHART_TIMELIME_TYPES)
  @IsNotEmpty()
  timeline: CHART_TIMELIME_TYPES;
}

export class GraphTimelineDto {
  @IsEnum(CHART_TIMELIME_TYPES)
  @IsNotEmpty()
  timeline: CHART_TIMELIME_TYPES;
}
