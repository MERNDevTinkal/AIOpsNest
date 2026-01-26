import React from 'react';
import { render, screen } from '@testing-library/react';
import Realtime from './Realtime';
import { io } from 'socket.io-client';

jest.mock('socket.io-client');

describe('Realtime page', () => {
  it('renders canvas and heading', () => {
    (io as jest.Mock).mockReturnValue({ on: jest.fn(), disconnect: jest.fn() });
    render(<Realtime />);
    expect(screen.getByText('Realtime visualization')).toBeInTheDocument();
  });
});
