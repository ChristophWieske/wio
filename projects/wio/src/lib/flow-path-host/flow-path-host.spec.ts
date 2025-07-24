import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlowPathHost } from './flow-path-host';

describe('FlowPathHost', () => {
  let component: FlowPathHost;
  let fixture: ComponentFixture<FlowPathHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowPathHost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlowPathHost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
