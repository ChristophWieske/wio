import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Wio } from './wio';

describe('Wio', () => {
  let component: Wio;
  let fixture: ComponentFixture<Wio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Wio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
