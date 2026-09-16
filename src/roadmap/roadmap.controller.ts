import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import {
  ChatSessionDetailResponse,
  CreateChatSessionRequest,
  CreateChatSessionResponse,
  IdParam,
  ListChatSessionsRequest,
  ListChatSessionsResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './dto/chat.dto';
import {
  CreateRoadmapRequest,
  RoadmapDetailResponse,
  RoadmapResponse,
  RoadmapSummaryResponse,
} from './dto/roadmap.dto';
import { RoadmapService } from './roadmap.service';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class RoadmapController {
  constructor(
    private readonly chatService: ChatService,
    private readonly roadmapService: RoadmapService,
  ) {}

  @Get('/chat/sessions')
  @HttpCode(HttpStatus.OK)
  async listSessions(
    @Req() req: Request & { user: User },
    @Query() request: ListChatSessionsRequest,
  ): Promise<ListChatSessionsResponse> {
    return this.chatService.listSessions(req.user.id, request);
  }

  @Post('/chat/sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Req() req: Request & { user: User },
    @Body() request: CreateChatSessionRequest,
  ): Promise<CreateChatSessionResponse> {
    return this.chatService.createSession(req.user.id, request);
  }

  @Get('/chat/sessions/:id')
  @HttpCode(HttpStatus.OK)
  async getSession(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<ChatSessionDetailResponse> {
    return this.chatService.getSession(req.user.id, id);
  }

  @Post('/chat/sessions/:id/messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
    @Body() request: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    return this.chatService.sendMessage(req.user.id, id, request.content);
  }

  @Post('/chat/sessions/:id/roadmaps')
  @HttpCode(HttpStatus.CREATED)
  async createRoadmap(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
    @Body() request: CreateRoadmapRequest,
  ): Promise<RoadmapResponse> {
    return this.roadmapService.create(req.user.id, id, request.title);
  }

  @Get('/chat/sessions/:id/roadmaps')
  @HttpCode(HttpStatus.OK)
  async listRoadmaps(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<RoadmapSummaryResponse[]> {
    return this.roadmapService.listBySession(req.user.id, id);
  }

  @Get('/roadmaps/:id')
  @HttpCode(HttpStatus.OK)
  async getRoadmap(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<RoadmapDetailResponse> {
    return this.roadmapService.get(req.user.id, id);
  }
}
