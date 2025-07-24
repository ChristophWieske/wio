import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowPath } from './flow-path';

describe('FlowPath', () => {
  let component: FlowPath;
  let fixture: ComponentFixture<FlowPath>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowPath]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowPath);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
