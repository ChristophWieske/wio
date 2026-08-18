import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { FlowPath, FlowPathHost, FlowPathNode, Obstacle } from 'flow-path';

@Component({
  selector: 'app-root',
  imports: [FlowPathHost, FlowPathNode, FlowPath, Obstacle, CdkDrag],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
