import { CdkDrag } from '@angular/cdk/drag-drop';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { FlowPath, FlowPathHost, FlowPathNode, Obstacle } from '../../../flow-path/src/public-api';

@Component({
  selector: 'app-root',
  imports: [
    FlowPathHost,
    FlowPathNode,
    FlowPath,
    Obstacle,
    CdkDrag,
    MatSlider,
    FormsModule,
    MatSliderThumb,
    MatLabel,
    MatFormField,
    MatInput,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly lineWidth = signal(5);
  readonly color = signal('#009900');
  readonly dash = signal('10,10');

  readonly dashArray = computed(() =>
    this.dash()
      .split(',')
      .map((s) => parseFloat(s.trim())),
  );
}
