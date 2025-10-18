export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ede3da, #c2a083)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px",
          padding: "3rem",
          boxShadow: "0 24px 60px rgba(194, 160, 131, 0.25)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid rgba(194, 160, 131, 0.2)",
            borderTopColor: "#c2a083",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1.5rem",
          }}
        />
        <p
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#5f4634",
            margin: 0,
          }}
        >
          Caricamento...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
