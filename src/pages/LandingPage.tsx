import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import TripOriginOutlinedIcon from "@mui/icons-material/TripOriginOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { Header } from "../components/Header";
import { useState } from "react";

interface LandingPageProps {
  setIsLandingPage: React.Dispatch<React.SetStateAction<boolean>>;
}
export const LandingPage = ({ setIsLandingPage }: LandingPageProps) => {
  const [open, setOpen] = useState(false);
  const handleVCR = () => {
    setOpen(true);
  };
  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "#3C576B;",
          color: "white",
          // boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          position: {
            xs: "fixed", // Apply these styles for mobile screens
          },
          top: {
            xs: "0px",
          },
          width: {
            xs: "100%",
          },
          zIndex: {
            xs: 3,
          },
          p: { xs: 1, md: 1, lg: 1 },
        }}
      >
        <Stack direction="row">
          <Typography variant="h6">Service Hub Inspection</Typography>
        </Stack>
      </AppBar>
      <Box>
        <Grid container>
          <Grid item xs={12}>
            <Header />
          </Grid>
        </Grid>
        <Box sx={{ mt: 20, ml: 1, mr: 1 }}>
          <Container maxWidth="md">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card onClick={handleVCR} sx={{ cursor: "pointer" }}>
                  <CardContent>
                    <Stack direction={"column"} alignItems="center">
                      <NoteAltOutlinedIcon
                        sx={{ color: (theme) => theme.palette.text.secondary }}
                      />
                      <Typography variant="h6" sx={{ color: "text.secondary" }}>
                        Vehicle Condition Report
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ cursor: "pointer" }}>
                  <CardContent>
                    <Stack direction={"column"} alignItems="center">
                      <FactCheckOutlinedIcon />
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ color: "text.secondary" }}
                      >
                        Vehicle Health Check
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ cursor: "pointer" }}>
                  <CardContent>
                    <Stack direction={"column"} alignItems="center">
                      <TripOriginOutlinedIcon
                        sx={{ color: (theme) => theme.palette.text.secondary }}
                      />
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ color: "text.secondary" }}
                      >
                        Tyre Check
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Container>
          <Drawer open={open} onClose={() => setOpen(false)} anchor="bottom">
            <Stack
              margin={1}
              spacing={1}
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Button variant="outlined" sx={{ textTransform: "none" }}>
                Traditional Check
              </Button>
              <Button
                variant="outlined"
                sx={{ textTransform: "none" }}
                onClick={() => {
                  setIsLandingPage(false);
                }}
              >
                Smart Check
              </Button>
            </Stack>
          </Drawer>
        </Box>
      </Box>
    </>
  );
};
