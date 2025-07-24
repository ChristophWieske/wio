import {Component} from '@angular/core';
import {FlowPath, FlowPathHost, FlowPathNode, Obstacle} from '../../../flow-path/src/public-api';

@Component({
  selector: 'app-root',
  imports: [FlowPathHost, FlowPathNode, FlowPath, Obstacle],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
