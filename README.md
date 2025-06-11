# Company Dashboard

A centralized, real-time company dashboard that displays goals, revenue funnel, VTO tracking, issues, scorecards, and knowledge base links - similar to a live debt ticker for company metrics.

## Features

- **Live Goals Tracking**: Real-time display of quarterly and monthly goals with progress bars
- **Revenue Funnel**: Interactive chart showing leads, prospects, qualified leads, proposals, and closed deals
- **VTO (Voluntary Time Off) Tracking**: Monitor available, used, pending, and remaining VTO
- **Issues Dashboard**: Track critical, high, medium, and low priority issues
- **Performance Scorecard**: Display key metrics like customer satisfaction, team efficiency, etc.
- **Knowledge Base**: Quick access links to company resources
- **Real-time Updates**: Live data updates using WebSockets
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **Frontend**: HTML5, CSS3, JavaScript
- **Charts**: Chart.js
- **Icons**: Font Awesome

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd company-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the dashboard**
   Open your browser and navigate to `http://localhost:3000`

## Deployment to Render

1. **Connect your GitHub repository to Render**
   - Go to [Render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub account and select this repository

2. **Configure the deployment**
   - **Name**: Choose a name for your service
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Environment Variables** (Optional)
   - Set `NODE_ENV` to `production`
   - Set `PORT` if needed (Render provides this automatically)

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your dashboard

## API Endpoints

### GET /api/dashboard
Returns the current dashboard data in JSON format.

### POST /api/update
Updates specific dashboard sections.

**Request Body:**
```json
{
  "section": "goals|revenueFunnel|vto|issues|scorecard|knowledgeBase",
  "data": {
    // Section-specific data
  }
}
```

## Real-time Updates

The dashboard automatically updates every 30 seconds with simulated data changes. In production, you can:

1. **Replace the cron job** in `server.js` with real data sources
2. **Use the API endpoints** to update data from external systems
3. **Integrate with webhooks** from your existing tools

## Customization

### Adding New Metrics
1. Update the `dashboardData` object in `server.js`
2. Add corresponding HTML elements in `public/index.html`
3. Create update functions in `public/dashboard.js`
4. Style the new elements in `public/styles.css`

### Connecting Real Data Sources
Replace the sample data in `server.js` with:
- Database connections
- API calls to your existing systems
- Webhook integrations
- File system monitoring

### Styling
All styles are in `public/styles.css`. The design uses:
- CSS Grid for responsive layouts
- CSS Gradients for modern appearance
- Smooth animations and transitions
- Mobile-first responsive design

## Sample Data Structure

The dashboard expects data in the following format:

```javascript
{
  goals: {
    quarterly: { target: 1000000, current: 750000, percentage: 75 },
    monthly: { target: 333333, current: 280000, percentage: 84 }
  },
  revenueFunnel: {
    leads: 1250, prospects: 875, qualified: 425, 
    proposals: 180, closed: 85, revenue: 750000
  },
  vto: { available: 240, used: 165, pending: 25, remaining: 75 },
  issues: { critical: 3, high: 12, medium: 28, low: 45, total: 88 },
  scorecard: {
    customerSatisfaction: 92, teamEfficiency: 88, 
    goalCompletion: 75, qualityScore: 94
  },
  knowledgeBase: [
    { title: "Company Policies", url: "#", category: "HR" }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your company's needs.

## Support

For questions or issues, please create an issue in the GitHub repository. 