export default function Footer() {
  return (
    <footer className="footer" id="app-footer">
      <div className="footer-left">
        &copy; {new Date().getFullYear()} DataBridge. All rights reserved.
      </div>
      <div className="footer-right">
        Data Processing Engine &bull; v1.0
      </div>
    </footer>
  )
}
