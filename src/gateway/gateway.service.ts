import { Injectable } from '@nestjs/common';
import { EmitMessageDto } from './dtos/emitMessageDto';

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { catchException } from '../admin/global/helpers/handle.exceptionh.helper';

@Injectable()
@WebSocketGateway({
  namespace: 'homnifi',
  cors: {
    origin: '*',
  },
})
export class GatewayService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  //Server module Start here
  @WebSocketServer()
  server: Server;

  private onlineUsers = 0;

  // This method handles new connections
  handleConnection(client: Socket) {
    client.setMaxListeners(2000); // Increase the limit to 20 listeners

    this.onlineUsers++;
    this.server.emit('onlineUsers', this.onlineUsers);
  }

  // This method handles disconnections
  handleDisconnect(client: Socket) {
    this.onlineUsers--;
    this.server.emit('onlineUsers', this.onlineUsers);
  }

  // This function helps to emit the event from anywhere in the repo
  async emitSocketEventNotification(request: EmitMessageDto) {
    try {
      await this.server.emit(request.eventName, {
        message: request.message,
        body: request.data,
      });
      return 'Sent Successfully';
    } catch (error) {
      catchException(error);
    }
  }

  // Handles 'Ping' messages
  @SubscribeMessage('Ping')
  onNewMessage(@MessageBody() body: any) {
    this.server.emit('Pong', {
      msg: 'Ping',
      Body: {
        Message: 'Lets start Both end connected',
      },
    });
  }

  getOnlineUsersCount(): number {
    return this.onlineUsers;
  }
}
