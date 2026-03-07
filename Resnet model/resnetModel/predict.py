import torch
import cv2
import numpy as np

from model import ResNetUNet


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = ResNetUNet().to(device)
model.load_state_dict(torch.load("models/flood_resnet_unet.pth", map_location=device))
model.eval()


image_path = "/Users/sivaram/Desktop/flood_project/dataset/FloodNet/Train/Labeled/Non-Flooded/image/10836.jpg"
img = cv2.imread(image_path)
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

img_resized = cv2.resize(img, (256,256))

img_tensor = torch.tensor(img_resized).permute(2,0,1).unsqueeze(0).float()/255.0
img_tensor = img_tensor.to(device)

with torch.no_grad():

    pred = model(img_tensor)

    pred = torch.sigmoid(pred)

    mask = pred.squeeze().cpu().numpy()


mask_binary= (mask <= 0.5).astype(np.uint8)


flood_pixels = np.sum(mask_binary)
total_pixels = mask_binary.size

print("Flood pixels:", flood_pixels)
print("Total pixels:", total_pixels)

flood_pixels = np.sum(mask_binary)
total_pixels = mask_binary.size

flood_percentage = (flood_pixels / total_pixels) * 100

print("Flood pixels:", flood_pixels)
print("Total pixels:", total_pixels)
print("Flood percentage:", round(flood_percentage, 2), "%")

# Percentage-based severity
if flood_percentage < 25:
    severity = "NO FLOOD"
elif flood_percentage < 40:
    severity = "NO FLOOD"
elif flood_percentage < 60:
    severity = "FLOOD"
else:
    severity = "HIGH FLOOD"

print("Flood Severity:", severity)

cv2.imshow("Original Image", img_resized)
cv2.imshow("Predicted Flood Mask", mask*255)

cv2.waitKey(0)
cv2.destroyAllWindows()